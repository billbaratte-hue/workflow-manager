/**
 * @file server/services/articlePdf.service.ts
 * Individual Article / Dossier PDF Generation Service (Epic 2 - User Story 2.2).
 * Formats a single mechatronic request into an official transmission slip and record.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DossierRecord {
    id: number | string;
    reference: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    beneficiaire_name?: string;
    beneficiaire_service?: string;
    site_name?: string;
    equipment_type?: string;
    intervention_duration?: string;
    is_team_request?: number | boolean;
    team_name?: string;
    team_company?: string;
    team_members?: string | any[];
    stages?: string | any[];
    process_name?: string;
    form_data?: string | Record<string, any>;
    complement_request?: string | any;
    ai_analysis?: string | any;
}

export class ArticlePdfService {
    /**
     * Generates a formal dossier PDF slip
     */
    static async generateDossierPdf(dossier: DossierRecord): Promise<Buffer> {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Header Banner
        doc.setFillColor(0, 35, 149); // #002395
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('PORTAIL MÉCATRONIQUE', 14, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('SYSTÈME DE GESTION MÉCATRONIQUE — BORDEREAU DE TRANSMISSION OFFICIEL', 14, 19);
        doc.text('Bordereau de Traçabilité Matérielle | Direction Sécurité & Accès', 14, 24);

        // Reference Badge on the top right
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(pageWidth - 65, 6, 52, 16, 2, 2, 'F');
        doc.setTextColor(0, 35, 149);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(dossier.reference || `REQ-${dossier.id}`, pageWidth - 39, 13, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Statut : ${dossier.status || 'ENREGISTRÉ'}`, pageWidth - 39, 18, { align: 'center' });

        // 2. Dossier Identification Card
        let currentY = 36;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(dossier.title || 'Demande d\'accès mécatronique', 14, currentY);

        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const creationDate = dossier.created_at ? new Date(dossier.created_at).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR');
        doc.text(`Créée le : ${creationDate}   |   Processus : ${dossier.process_name || 'Émission Clé & Badge Mécatronique'}`, 14, currentY);

        currentY += 8;

        // 3. Beneficiary & Location Details Table
        const infoData = [
            ['Bénéficiaire / Demandeur', dossier.beneficiaire_name || 'Non spécifié', 'Service / Direction', dossier.beneficiaire_service || 'Service Opérations'],
            ['Site d\'intervention', dossier.site_name || 'Tous sites rattachés', 'Équipement / Support', dossier.equipment_type || 'Clé Mécatronique F9000'],
            ['Durée prévue', dossier.intervention_duration || 'Mission standard', 'Demande collective ?', dossier.is_team_request ? 'Oui (Équipe projet)' : 'Non (Individuelle)']
        ];

        if (dossier.is_team_request) {
            infoData.push([
                'Nom de l\'équipe', dossier.team_name || '-',
                'Entreprise / Entité', dossier.team_company || 'Interne'
            ]);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['Caractéristique', 'Valeur', 'Caractéristique', 'Valeur']],
            body: infoData,
            theme: 'grid',
            headStyles: {
                fillColor: [241, 245, 249],
                textColor: [30, 41, 59],
                fontStyle: 'bold',
                fontSize: 8.5
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [51, 65, 85]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 45 },
                1: { cellWidth: 50 },
                2: { fontStyle: 'bold', cellWidth: 45 },
                3: { cellWidth: 42 }
            },
            margin: { left: 14, right: 14 }
        });

        // 4. Description & Technical Context
        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 35, 149);
        doc.text('Description et Justification Opérationnelle', 14, currentY);

        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const splitDescription = doc.splitTextToSize(dossier.description || 'Aucune description complémentaire fournie.', pageWidth - 28);
        doc.text(splitDescription, 14, currentY);

        currentY += splitDescription.length * 4.5 + 6;

        // 5. Workflow Stages / Signatures Table
        let stagesList: any[] = [];
        if (typeof dossier.stages === 'string') {
            try { stagesList = JSON.parse(dossier.stages); } catch {}
        } else if (Array.isArray(dossier.stages)) {
            stagesList = dossier.stages;
        }

        if (stagesList.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(0, 35, 149);
            doc.text('Circuit de Validation & Visa Hiérarchique', 14, currentY);
            currentY += 4;

            const stagesRows = stagesList.map((st, idx) => [
                `Étape ${idx + 1} : ${st.name || st.title || 'Validation'}`,
                st.assigned_role || st.role || 'Validateur',
                st.status || 'En attente',
                st.decided_by || st.validator_name || '-',
                st.decided_at ? new Date(st.decided_at).toLocaleDateString('fr-FR') : '-'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Étape du Workflow', 'Rôle Attribué', 'État', 'Décideur', 'Date']],
                body: stagesRows,
                theme: 'striped',
                headStyles: {
                    fillColor: [0, 35, 149],
                    textColor: [255, 255, 255],
                    fontSize: 8.5
                },
                bodyStyles: { fontSize: 8 },
                margin: { left: 14, right: 14 }
            });

            // @ts-ignore
            currentY = (doc as any).lastAutoTable.finalY + 8;
        }

        // 6. Signatures Box (Signatures manuscrites / électroniques)
        if (currentY > pageHeight - 45) {
            doc.addPage();
            currentY = 20;
        }

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);

        // Box 1 : Signature Demandeur
        doc.rect(14, currentY, (pageWidth - 36) / 2, 28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('VISA & SIGNATURE DU DEMANDEUR', 18, currentY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Nom : ${dossier.beneficiaire_name || 'Collaborateur'}`, 18, currentY + 12);
        doc.text('Mention "Bon pour accord et conformité"', 18, currentY + 24);

        // Box 2 : Visa Autorité Sécurité / Régie
        const box2X = 14 + (pageWidth - 36) / 2 + 8;
        doc.rect(box2X, currentY, (pageWidth - 36) / 2, 28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('VISA DU RESPONSABLE DE SITE / RÉGIE', box2X + 4, currentY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('Clé / Badge délivré le : .... / .... / 2026', box2X + 4, currentY + 12);
        doc.text('Numéro de série matériel : ........................', box2X + 4, currentY + 18);
        doc.text('Cachet de l\'établissement & émargement', box2X + 4, currentY + 24);

        // Footer
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Document généré par le Système d\'Échange Mécatronique — Valeur de preuve probante NIS 2', 14, pageHeight - 8);
        doc.text(`Réf : ${dossier.reference || dossier.id}`, pageWidth - 14, pageHeight - 8, { align: 'right' });

        const arrayBuffer = doc.output('arraybuffer');
        return Buffer.from(arrayBuffer);
    }
}
