/**
 * @file src/utils/exportGridPdf.ts
 * Client utility to trigger formatted Data Grid PDF exports (Epic 2 - User Story 2.1).
 */

export interface ExportColumn {
    header: string;
    dataKey: string;
}

export interface ExportGridOptions {
    title: string;
    subtitle?: string;
    orientation?: 'portrait' | 'landscape';
    columns: ExportColumn[];
    rows: Record<string, any>[];
    fileName?: string;
}

export async function downloadGridPdf(options: ExportGridOptions): Promise<void> {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/v1/export/grid-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            title: options.title,
            subtitle: options.subtitle || `Extrait le ${new Date().toLocaleDateString('fr-FR')}`,
            orientation: options.orientation || 'landscape',
            columns: options.columns,
            rows: options.rows
        })
    });

    if (!res.ok) {
        throw new Error('Erreur lors de la génération du rapport PDF.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.fileName || `${options.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
