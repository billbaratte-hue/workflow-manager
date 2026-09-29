/**
 * @file server/services/exportPdf.service.ts
 * Data Grid PDF Export Service for Mechatronic Portal (Epic 2 - User Story 2.1).
 * Converts structured list data (requests, users, hardware inventory, audit logs) into formatted PDF documents.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GridPdfColumn {
    header: string;
    dataKey: string;
    width?: number;
}

export interface GridPdfOptions {
    title: string;
    subtitle?: string;
    author?: string;
    orientation?: 'portrait' | 'landscape';
    columns: GridPdfColumn[];
    rows: Record<string, any>[];
    metadata?: Record<string, string>;
}

export class ExportPdfService {
    /**
     * Generates a binary PDF buffer from structured tabular data
     */
    static async generateGridPdf(options: GridPdfOptions): Promise<Buffer> {
        const orientation = options.orientation || 'landscape';
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Header Banner (Corporate Blue)
        doc.setFillColor(0, 35, 149); // #002395
        doc.rect(0, 0, pageWidth, 24, 'F');

        // Brand Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('PORTAIL MÉCATRONIQUE', 14, 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Système Central d\'Échange et de Gestion des Accès Sécurisés', 14, 18);

        // Document Title & Metadata on the right
        doc.setFontSize(8);
        const exportDate = new Date().toLocaleString('fr-FR');
        doc.text(`Exporté le : ${exportDate}`, pageWidth - 14, 11, { align: 'right' });
        doc.text(`Auteur : ${options.author || 'Système Central'}`, pageWidth - 14, 18, { align: 'right' });

        // 2. Section Title
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(options.title, 14, 34);

        if (options.subtitle) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(options.subtitle, 14, 40);
        }

        // 3. Optional Metadata Pills
        let startTableY = options.subtitle ? 46 : 40;
        if (options.metadata) {
            const metaStrings = Object.entries(options.metadata).map(([k, v]) => `${k}: ${v}`).join('  |  ');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(metaStrings, 14, startTableY);
            startTableY += 6;
        }

        // 4. AutoTable Data Grid
        const tableColumns = options.columns.map(c => ({
            header: c.header,
            dataKey: c.dataKey
        }));

        const tableBody = options.rows.map(row => {
            const formattedRow: Record<string, any> = {};
            for (const col of options.columns) {
                const val = row[col.dataKey];
                if (val === null || val === undefined) {
                    formattedRow[col.dataKey] = '-';
                } else if (typeof val === 'object') {
                    formattedRow[col.dataKey] = JSON.stringify(val);
                } else {
                    formattedRow[col.dataKey] = String(val);
                }
            }
            return formattedRow;
        });

        autoTable(doc, {
            startY: startTableY,
            head: [tableColumns.map(c => c.header)],
            body: tableBody.map(row => tableColumns.map(c => row[c.dataKey])),
            theme: 'striped',
            headStyles: {
                fillColor: [0, 35, 149],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { left: 14, right: 14, bottom: 18 },
            didDrawPage: (data) => {
                // Footer with confidentiality and page numbers
                const currentPage = doc.internal.pages.length - 1;
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text('DOCUMENT STRICTEMENT CONFIDENTIEL — USAGE INTERNE', 14, pageHeight - 8);
                doc.text(
                    `Page ${currentPage}`,
                    pageWidth - 14,
                    pageHeight - 8,
                    { align: 'right' }
                );
            }
        });

        const arrayBuffer = doc.output('arraybuffer');
        return Buffer.from(arrayBuffer);
    }
}
