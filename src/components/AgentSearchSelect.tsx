import React, { useState, useId } from 'react';
import { Search, User, X, Check } from 'lucide-react';

export interface AgentRecord {
    id: number | string;
    name: string;
    email: string;
    cp?: string;
    service?: string;
    role?: string;
}

export interface AgentSearchSelectProps {
    agents?: AgentRecord[];
    selectedAgentId?: number | string | null;
    onSelectAgent: (agent: AgentRecord | null) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
}

export const DEFAULT_MOCK_AGENTS: AgentRecord[] = [
    { id: 101, name: 'Jean Dupont', email: 'jean.dupont@entreprise.fr', cp: 'CP84920', service: 'Maintenance Voie', role: 'Demandeur' },
    { id: 102, name: 'Valérie Bernard', email: 'valerie.bernard@entreprise.fr', cp: 'CP10492', service: 'Sécurité Électrique', role: 'Validateur' },
    { id: 103, name: 'Marc Martin', email: 'marc.martin@entreprise.fr', cp: 'CP99281', service: 'Régie Matérielle', role: 'Gestionnaire Régie' },
    { id: 104, name: 'Sophie Lefebvre', email: 'sophie.lefebvre@entreprise.fr', cp: 'CP30291', service: 'Signalisation Nord', role: 'Demandeur' }
];

export const AgentSearchSelect: React.FC<AgentSearchSelectProps> = ({
    agents = DEFAULT_MOCK_AGENTS,
    selectedAgentId = null,
    onSelectAgent,
    label = 'Agent / Bénéficiaire',
    placeholder = 'Rechercher par nom, CP (ex: CP84920) ou service...',
    disabled = false,
    required = false,
    className = ''
}) => {
    const inputId = useId();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const selectedAgent = agents.find(a => String(a.id) === String(selectedAgentId)) || null;

    const filteredAgents = agents.filter(agent => {
        const q = query.toLowerCase();
        return (
            agent.name.toLowerCase().includes(q) ||
            agent.email.toLowerCase().includes(q) ||
            (agent.cp && agent.cp.toLowerCase().includes(q)) ||
            (agent.service && agent.service.toLowerCase().includes(q))
        );
    });

    const handleSelect = (agent: AgentRecord) => {
        onSelectAgent(agent);
        setIsOpen(false);
        setQuery('');
    };

    const handleClear = () => {
        onSelectAgent(null);
        setQuery('');
    };

    return (
        <div className={`relative w-full ${className}`}>
            {label && (
                <label 
                    htmlFor={inputId}
                    className="block text-xs font-semibold text-gray-700 mb-1"
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {selectedAgent ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0088CE]/10 text-[#0088CE] flex items-center justify-center font-bold text-xs">
                            {selectedAgent.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                                <span>{selectedAgent.name}</span>
                                {selectedAgent.cp && (
                                    <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-mono">
                                        {selectedAgent.cp}
                                    </span>
                                )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                                {selectedAgent.service || selectedAgent.email}
                            </div>
                        </div>
                    </div>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Effacer la sélection"
                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            id={inputId}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            placeholder={placeholder}
                            disabled={disabled}
                            aria-expanded={isOpen}
                            aria-autocomplete="list"
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0088CE] text-gray-900 placeholder:text-gray-400"
                        />
                    </div>

                    {isOpen && (
                        <div 
                            role="listbox"
                            className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-50"
                        >
                            {filteredAgents.length === 0 ? (
                                <div className="p-3 text-xs text-center text-gray-500">
                                    Aucun agent trouvé pour "{query}"
                                </div>
                            ) : (
                                filteredAgents.map(agent => (
                                    <button
                                        key={agent.id}
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        onClick={() => handleSelect(agent)}
                                        className="w-full flex items-center justify-between p-2.5 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-xs font-semibold text-gray-900">
                                                    {agent.name}
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    {agent.cp ? `${agent.cp} · ` : ''}{agent.service || agent.email}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
