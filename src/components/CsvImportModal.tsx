import React, { useState } from 'react';
import { CustomTable } from '../types';
import { importTableCsv } from '../lib/api';
import {
    Upload,
    X,
    Check,
    AlertCircle,
    FileSpreadsheet,
    ArrowRight,
    ArrowLeft,
    Table as TableIcon,
    RefreshCw
} from 'lucide-react';

interface CsvImportModalProps {
    isOpen: boolean;
    table: CustomTable;
    onClose: () => void;
    onSuccess: (count: number) => void;
}

export default function CsvImportModal({ isOpen, table, onClose, onSuccess }: CsvImportModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRowsRaw, setCsvRowsRaw] = useState<string[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}); // tableColKey -> csvHeader
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Helper: parse simple CSV with delimiter autodetection (comma or semicolon)
    const parseCsvText = (text: string) => {
        const lines = text
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (lines.length < 2) {
            throw new Error("Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données.");
        }

        // Detect delimiter
        const firstLine = lines[0];
        const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';

        const parseLine = (line: string): string[] => {
            const result: string[] = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === delimiter && !inQuotes) {
                    result.push(cur.trim());
                    cur = '';
                } else {
                    cur += char;
                }
            }
            result.push(cur.trim());
            return result;
        };

        const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
        const dataRows = lines.slice(1).map(l => parseLine(l));

        return { headers, dataRows };
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const { headers, dataRows } = parseCsvText(text);
                setCsvHeaders(headers);
                setCsvRowsRaw(dataRows);

                // Auto-map columns where names or keys loosely match
                const autoMap: Record<string, string> = {};
                for (const col of table.columns) {
                    const targetKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const targetLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    const matchedHeader = headers.find(h => {
                        const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return hClean === targetKey || hClean === targetLabel || hClean.includes(targetKey) || targetKey.includes(hClean);
                    });

                    if (matchedHeader) {
                        autoMap[col.key] = matchedHeader;
                    }
                }

                setColumnMapping(autoMap);
                setStep(2);
            } catch (err: any) {
                setError(err.message || "Erreur de lecture du fichier CSV.");
            }
        };
        reader.readAsText(file, 'utf-8');
    };

    // Build mapped preview rows (up to 5)
    const buildMappedRows = (limit?: number) => {
        const rowsToProcess = limit ? csvRowsRaw.slice(0, limit) : csvRowsRaw;
        return rowsToProcess.map(rawValues => {
            const rowObj: Record<string, any> = {};
            for (const col of table.columns) {
                const mappedCsvHeader = columnMapping[col.key];
                if (mappedCsvHeader) {
                    const headerIdx = csvHeaders.indexOf(mappedCsvHeader);
                    if (headerIdx !== -1 && rawValues[headerIdx] !== undefined) {
                        let val: any = rawValues[headerIdx];
                        if (col.type === 'number') {
                            const num = Number(val);
                            val = isNaN(num) ? val : num;
                        } else if (col.type === 'boolean') {
                            val = val === 'true' || val === '1' || val === 'oui' || val === true;
                        }
                        rowObj[col.key] = val;
                    }
                }
            }
            return rowObj;
        });
    };

    const handleImportSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const mappedRows = buildMappedRows();
            const res = await importTableCsv(table.id, mappedRows);
            if (res.data?.success) {
                onSuccess(res.data.imported_count || mappedRows.length);
                onClose();
            } else {
                setError("Échec lors de l'importation des données.");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Erreur lors de l'importation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/90">
                    <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span>Importer des Données en Masse (CSV) — {table.name}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Wizard Steps indicator */}
                <div className="px-6 py-2.5 bg-slate-50 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                    <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-600 font-bold' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
                        <span>Fichier CSV</span>
                    </div>
                    <div className="text-gray-300">→</div>
                    <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-600 font-bold' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</span>
                        <span>Mapping des Colonnes</span>
                    </div>
                    <div className="text-gray-300">→</div>
                    <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-600 font-bold' : ''}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>3</span>
                        <span>Aperçu & Validation</span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Step 1: Upload File */}
                    {step === 1 && (
                        <div className="text-center py-8 space-y-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 transition bg-gray-50/50">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                            <div>
                                <h4 className="text-sm font-bold text-gray-800">Sélectionnez votre fichier CSV</h4>
                                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                    Délimiteur virgule (,) ou point-virgule (;) encodé en UTF-8.
                                </p>
                            </div>
                            <div>
                                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer shadow-xs">
                                    <span>Parcourir les fichiers</span>
                                    <input
                                        type="file"
                                        accept=".csv,text/csv,text/plain"
                                        onChange={handleFileSelected}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        Associez les colonnes du CSV aux champs de la table
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        {csvRowsRaw.length} lignes détectées dans le fichier.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                {table.columns.map(col => {
                                    const currentMapping = columnMapping[col.key] || '';
                                    return (
                                        <div
                                            key={col.key}
                                            className="p-3 border border-gray-200 rounded-xl flex items-center justify-between gap-4 bg-gray-50/60"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-900">{col.label}</span>
                                                    {col.required && (
                                                        <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-bold">
                                                            Requis
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                                    Clé : {col.key} ({col.type})
                                                </span>
                                            </div>

                                            <div className="w-56 shrink-0">
                                                <select
                                                    value={currentMapping}
                                                    onChange={e => setColumnMapping({ ...columnMapping, [col.key]: e.target.value })}
                                                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                                >
                                                    <option value="">-- Ignorer cette colonne --</option>
                                                    {csvHeaders.map(h => (
                                                        <option key={h} value={h}>
                                                            {h}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        Aperçu des 5 premières lignes mappées
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Total à importer : <strong className="text-indigo-600 font-bold">{csvRowsRaw.length} enregistrements</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-[300px]">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-100/80 sticky top-0 text-gray-700">
                                        <tr>
                                            <th className="p-2 border-b font-bold text-[11px]">#</th>
                                            {table.columns.map(col => (
                                                <th key={col.key} className="p-2 border-b font-bold text-[11px] whitespace-nowrap">
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {buildMappedRows(5).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                                                {table.columns.map(col => (
                                                    <td key={col.key} className="p-2 text-gray-800 whitespace-nowrap truncate max-w-[150px]">
                                                        {row[col.key] !== undefined ? String(row[col.key]) : <span className="text-gray-300 italic">-</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep((step - 1) as any)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Précédent</span>
                        </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                        >
                            Annuler
                        </button>

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                            >
                                <span>Voir l'aperçu</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={handleImportSubmit}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Confirmer & Importer {csvRowsRaw.length} Lignes</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
